set :stages, %w(production production-sio production-sio-ssl production-img production-geckoboard development development-sio development-sio-ssl development-img development-blr-img development-blr-sio development-blr-sio-ssl development-blr development-check-live-status)
set :default_stage, 'development'
require 'capistrano/ext/multistage'

ssh_options[:forward_agent] = true
default_run_options[:pty] = true 

set :application, "livestream-api"
set :init_script, "nodejs-server"
set :repository,  "git@github.com:Livestream/node-api"
set :deploy_to, "/home/deploynode/node-api"

set :admin_runner, 'deploynode'
set :local_scm_command, "git"
set :scm_command, "#{try_sudo} git"
set :deploy_via, :remote_cache

set :scm, :git

set :irccat_host, 'lsadmin.lsops.org'
set :irccat_port, '12345'

namespace :deploy do
  task :finalize_update, :except => { :no_release => true } do
    run <<-CMD if fetch(:group_writable, true)
      chmod -R g+w #{latest_release} &&
      chmod g+s #{latest_release} &&
      #{try_sudo} mkdir #{latest_release}/pids #{latest_release}/logs
    CMD
  end

  desc "Restarting the Node.js process"
  task :restart, :roles => :app, :except => { :no_release => true } do
    run "#{try_sudo} /etc/init.d/#{init_script} restart"
  end

  desc "Starting the Node.js process"
  task :start, :roles => :app do
    run "#{try_sudo} /etc/init.d/#{init_script} start"
  end

  desc "Stopping the app Node.js process"
  task :stop, :roles => :app do
    run "#{try_sudo} /etc/init.d/#{init_script} stop"
  end

  task :notify_irc do
    #run "echo \"#noc '$USER' deployed '#{application}' stage '#{stage}' to '$CAPISTRANO:HOST$'\" | nc #{irccat_host} #{irccat_port}; return 0"
    system "echo \"#noc '$USER' deployed '#{application}' stage '#{stage}' commit '$(git log --oneline -n 1 #{current_revision})'\" | nc #{irccat_host} #{irccat_port}"
  end

  task :push_deploy_tag do
    user = `git config --get user.name`.chomp
    email = `git config --get user.email`.chomp
    puts `git tag release_#{stage}_#{release_name} #{current_revision} -m "Deployed by #{user} <#{email}>"`
    puts `git push --tags origin`
  end

end

after 'deploy', 'deploy:notify_irc'
after 'deploy', 'deploy:push_deploy_tag'
